from django.db import transaction
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['id', 'phone', 'department', 'role', 'bio', 'city', 'avatar_color']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'profile']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

class UserMiniSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    avatar_color = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email', 'role', 'avatar_color']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_role(self, obj):
        try:
            return obj.profile.role
        except UserProfile.DoesNotExist:
            return 'member'

    def get_avatar_color(self, obj):
        try:
            return obj.profile.avatar_color
        except UserProfile.DoesNotExist:
            return '#4F46E5'

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, default='')
    department = serializers.CharField(required=False, allow_blank=True, default='')
    city = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2', 'phone', 'department', 'city']
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        email = data.get('email', '').strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'Email already in use.'})
        data['email'] = email
        return data

    @transaction.atomic
    def create(self, validated_data):
        phone = validated_data.pop('phone', '')
        department = validated_data.pop('department', '')
        city = validated_data.pop('city', '')
        validated_data.pop('password2')

        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, role='member', phone=phone, department=department, city=city)
        return user

class ProfileUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.EmailField(source='user.email')

    class Meta:
        model = UserProfile
        fields = ['first_name', 'last_name', 'email', 'phone', 'department', 'bio', 'city', 'avatar_color']
        extra_kwargs = {'first_name': {'required': False}, 'last_name': {'required': False}, 'email': {'required': False}}

    def validate_email(self, value):
        email = value.strip()
        if User.objects.filter(email__iexact=email).exclude(pk=self.instance.user_id).exists():
            raise serializers.ValidationError('This email address is already in use.')
        return email

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        for attr, val in user_data.items():
            setattr(instance.user, attr, val)
        instance.user.save()
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance
