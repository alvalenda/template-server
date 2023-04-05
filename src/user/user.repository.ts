import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { genSalt, hash, compare } from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private readonly dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'password' | 'salt'>> {
    const { name, email, password, confirmPassword } = createUserDto;

    if (password !== confirmPassword) {
      throw {
        name: 'ValidationError',
        message: 'Passwords do not match',
      };
    }

    const user = new User();
    user.name = name;
    user.email = email;
    user.salt = await genSalt();
    user.password = await this.hashPassword(password, user.salt);

    await this.save(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  async findAll(): Promise<User[]> {
    return await this.find({ select: ['id', 'name', 'email'] });
  }

  async findOneUser(id: number): Promise<User> {
    const user = await this.findOne({
      where: { id },
      select: ['id', 'name', 'email'],
    });

    if (!user)
      throw {
        name: 'NotFoundError',
        message: `User with id '${id}' not found`,
      };

    return user;
  }

  async updateUser(
    id: number,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'password' | 'salt'>> {
    const user = await this.findOneFull(id);

    if (dto?.password) {
      if (dto.password !== dto.confirmPassword)
        throw {
          name: 'UnauthorizedError',
          message: 'Passwords do not match',
        };

      user.password = await this.hashPassword(dto.password, user.salt);
    }

    user.name = dto?.name ?? user.name;
    user.email = dto?.email ?? user.email;

    await this.save(user);
    return { id: user.id, name: user.name, email: user.email };
  }

  async removeUser(id: number): Promise<void> {
    await this.remove(await this.findOneFull(id));
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    return hash(password, salt);
  }

  private async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const teste = await compare(password, hashedPassword);

    return teste;
  }

  private async findOneFull(id: number): Promise<User> {
    const user = await this.findOne({
      where: { id },
    });

    if (!user)
      throw {
        name: 'NotFoundError',
        message: `User with id '${id}' not found`,
      };

    return user;
  }
}
